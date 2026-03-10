'use client';

import { useState, useEffect } from 'react';
import { Bell, Droplets, Dumbbell, Save, Scale, Utensils } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import StatCard from '@/components/ui/StatCard';

export default function PreferencesPage() {
  const { user, loading, refetch } = useUser();
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [waterNotif, setWaterNotif] = useState(true);
  const [mealNotif, setMealNotif] = useState(true);
  const [weighInNotif, setWeighInNotif] = useState(true);
  const [workoutNotif, setWorkoutNotif] = useState(true);

  useEffect(() => {
    if (!user?.settings) return;
    const s = user.settings;
    setUnits(s.units || 'metric');
    setWaterNotif(s.notifications?.water ?? true);
    setMealNotif(s.notifications?.meals ?? true);
    setWeighInNotif(s.notifications?.weighIn ?? true);
    setWorkoutNotif(s.notifications?.workout ?? true);
  }, [user]);

  const savePreferences = async () => {
    setSaving(true);
    try {
      const res = await api.updateSettings({
        units,
        notifications: {
          water: waterNotif,
          meals: mealNotif,
          weighIn: weighInNotif,
          workout: workoutNotif,
        },
      });
      if (res.success) {
        showToast('Preferences saved', 'success');
        refetch();
      } else {
        showToast(res.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <CardSkeleton className="h-80" />
      </div>
    );
  }

  const enabledCount = [waterNotif, mealNotif, weighInNotif, workoutNotif].filter(Boolean).length;

  return (
    <div className="animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop">
      <DashboardPageShell
        title="Preferences"
        subtitle="Units and reminders across your trackers"
        icon={Bell}
        iconClassName="text-accent-violet"
        mobileVariant="minimal"
      />

      {/* Summary */}
      <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '80ms' }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Scale}
          label="Units"
          value={units === 'metric' ? 'Metric' : 'Imperial'}
          subtitle={units === 'metric' ? 'kg, cm' : 'lbs, in'}
          iconColor="text-accent-violet"
        />
        <StatCard
          icon={Bell}
          label="Reminders"
          value={`${enabledCount}/4 enabled`}
          subtitle="Water, meals, weigh-in, workout"
          iconColor={enabledCount > 0 ? 'text-accent-emerald' : 'text-text-muted'}
        />
      </div>
      </div>

      <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '160ms' }}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
        {/* Left: units */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <div className="glass-card rounded-2xl p-6 shrink-0">
            <p className="text-sm font-semibold text-text-primary">Units</p>
            <p className="mt-2 text-xs text-text-muted">
              Choose how weight and height are displayed across the app.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(['metric', 'imperial'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left transition-all',
                    units === u
                      ? 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet'
                      : 'border-white/[0.06] bg-white/[0.03] text-text-muted hover:bg-white/[0.05] hover:text-text-primary'
                  )}
                >
                  <p className="text-sm font-semibold capitalize">{u}</p>
                  <p className="mt-0.5 text-[11px] opacity-80">{u === 'metric' ? 'kg, cm' : 'lbs, in'}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex-1 min-h-0 flex flex-col">
            <p className="text-sm font-semibold text-text-primary">Tip</p>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              Reminders help you build consistency. If you disable all reminders, you can still log manually anytime.
            </p>
          </div>
        </div>

        {/* Right: notifications */}
        <div className="glass-card flex h-full flex-col rounded-2xl p-6 lg:min-h-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Reminder notifications</p>
              <p className="mt-1 text-xs text-text-muted">Control what you get nudged about.</p>
            </div>
            <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-text-muted">
              {enabledCount}/4 on
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {[
              { key: 'water', label: 'Water reminders', value: waterNotif, set: setWaterNotif, icon: Droplets, color: 'text-accent-cyan' },
              { key: 'meals', label: 'Meal logging reminders', value: mealNotif, set: setMealNotif, icon: Utensils, color: 'text-accent-emerald' },
              { key: 'weighIn', label: 'Daily weigh-in', value: weighInNotif, set: setWeighInNotif, icon: Scale, color: 'text-accent-amber' },
              { key: 'workout', label: 'Workout reminders', value: workoutNotif, set: setWorkoutNotif, icon: Dumbbell, color: 'text-accent-rose' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.02] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]', item.color)}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="truncate text-sm font-medium text-text-secondary">{item.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => item.set(!item.value)}
                  className={cn(
                    'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                    item.value ? 'bg-accent-violet' : 'bg-white/[0.1]'
                  )}
                  aria-pressed={item.value}
                  aria-label={`${item.label}: ${item.value ? 'on' : 'off'}`}
                >
                  <span
                    className={cn(
                      'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200',
                      item.value && 'translate-x-5'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end pt-4">
            <button
              onClick={savePreferences}
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
  );
}
