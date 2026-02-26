'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';

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
        <CardSkeleton className="h-80 max-w-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Preferences</h1>

      <div className="glass-card rounded-2xl p-6 max-w-xl space-y-5">
        <div>
          <label className="text-xs font-medium text-text-muted">Units</label>
          <div className="mt-2 flex gap-2">
            {(['metric', 'imperial'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnits(u)}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-medium capitalize transition-all',
                  units === u
                    ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                    : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                )}
              >
                {u} ({u === 'metric' ? 'kg, cm' : 'lbs, in'})
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted">Reminder Notifications</label>
          <div className="mt-2 space-y-2">
            {[
              { key: 'water', label: 'Water reminders', value: waterNotif, set: setWaterNotif },
              { key: 'meals', label: 'Meal logging reminders', value: mealNotif, set: setMealNotif },
              { key: 'weighIn', label: 'Daily weigh-in', value: weighInNotif, set: setWeighInNotif },
              { key: 'workout', label: 'Workout reminders', value: workoutNotif, set: setWorkoutNotif },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3"
              >
                <span className="text-sm text-text-secondary">{item.label}</span>
                <button
                  onClick={() => item.set(!item.value)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors duration-200',
                    item.value ? 'bg-accent-violet' : 'bg-white/[0.1]'
                  )}
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
        </div>

        <div className="flex justify-end border-t border-white/[0.06] pt-4">
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
  );
}
