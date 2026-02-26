'use client';

import type { UserStreaks } from '@/types';
import { StreakCard } from './StreakCard';

interface StreakBarProps {
  streaks?: UserStreaks | null;
}

const EMPTY_STREAKS: UserStreaks = {
  current: {
    logging: 0,
    calories: 0,
    water: 0,
    workout: 0,
    sleep: 0,
    weight: 0,
  },
  best: {
    logging: 0,
    calories: 0,
    water: 0,
    workout: 0,
    sleep: 0,
    weight: 0,
  },
};

export function StreakBar({ streaks }: StreakBarProps) {
  const s = streaks ?? EMPTY_STREAKS;
  const items = [
    { key: 'logging' as const, label: 'Healthy days' },
    { key: 'calories' as const, label: 'Food log' },
    { key: 'water' as const, label: 'Water' },
    { key: 'weight' as const, label: 'Weight' },
    { key: 'workout' as const, label: 'Workouts' },
    { key: 'sleep' as const, label: 'Sleep' },
  ];

  const activeItems = items.filter((item) => s.current[item.key] > 0);

  return (
    <div className="glass-card flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Active streaks
        </p>
      </div>
      {activeItems.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-center">
          <p className="text-sm font-medium text-text-secondary">No active streaks</p>
          <p className="mt-1 text-[11px] text-text-muted">Log today to start one.</p>
        </div>
      ) : (
        <div className="mt-1 flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
          {activeItems.map((item) => (
            <div key={item.key} className="min-w-[150px] max-w-[180px] flex-1">
              <StreakCard label={item.label} current={s.current[item.key]} best={s.best[item.key]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

