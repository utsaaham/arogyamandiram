'use client';

// ============================================
// Coach › Overview - target-reached congratulation nudge
// ============================================
// Shows when the goal is lose_fat and the latest weight is at/below target.
// Suggest-only: offers a goal switch (Recomp / Build Muscle) but never
// auto-switches and never blocks. Dismissal is keyed to the targetWeight
// value so the nudge re-arms when the user sets a new, lower target.

import { useState } from 'react';
import { PartyPopper, X, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { showToast } from '@/components/ui/Toast';

export default function GoalReachedBanner() {
  const { user, refetch } = useUser();
  const [busy, setBusy] = useState<'recomp' | 'build_muscle' | 'dismiss' | null>(null);

  const profile = user?.profile;
  const weight = profile?.weight;
  const targetWeight = profile?.targetWeight;
  const dismissedFor = user?.settings?.nudges?.targetReachedDismissedForTargetWeight;

  const show =
    profile?.goal === 'lose_fat' &&
    typeof weight === 'number' &&
    typeof targetWeight === 'number' &&
    targetWeight > 0 &&
    weight <= targetWeight &&
    dismissedFor !== targetWeight;

  if (!show) return null;

  const switchGoal = async (goal: 'recomp' | 'build_muscle') => {
    setBusy(goal);
    try {
      const res = await api.updateUser({ profile: { goal } });
      if (res.success) {
        showToast(goal === 'recomp' ? 'Goal switched to Recomposition' : 'Goal switched to Build Muscle', 'success');
        await refetch();
      } else {
        showToast(res.error || 'Failed to switch goal', 'error');
      }
    } catch {
      showToast('Failed to switch goal', 'error');
    } finally {
      setBusy(null);
    }
  };

  const dismiss = async () => {
    setBusy('dismiss');
    try {
      const res = await api.updateSettings({ nudges: { targetReachedDismissedForTargetWeight: targetWeight } });
      if (res.success) await refetch();
      else showToast(res.error || 'Failed to dismiss', 'error');
    } catch {
      showToast('Failed to dismiss', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.06] p-5">
      <button
        type="button"
        onClick={dismiss}
        disabled={busy !== null}
        title="Dismiss"
        className="absolute right-3 top-3 rounded-lg p-1 text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
      >
        {busy === 'dismiss' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
          <PartyPopper className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-300">
            You reached your target weight of {targetWeight} kg. Huge win.
          </p>
          <p className="mt-1 text-xs text-emerald-100/80">
            Fat loss did its job. If you want a new challenge, switching your goal keeps the momentum going - your call, nothing changes unless you choose it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => switchGoal('recomp')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy === 'recomp' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Switch to Recomposition
            </button>
            <button
              type="button"
              onClick={() => switchGoal('build_muscle')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {busy === 'build_muscle' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Switch to Build Muscle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
