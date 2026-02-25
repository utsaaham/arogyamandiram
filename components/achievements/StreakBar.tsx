'use client';

import type { UserStreaks } from '@/types';
import { StreakCard } from './StreakCard';

interface StreakBarProps {
  streaks: UserStreaks;
}

export function StreakBar({ streaks }: StreakBarProps) {
  const items = [
    { key: 'logging' as const, label: 'Healthy days' },
    { key: 'calories' as const, label: 'Food log' },
    { key: 'water' as const, label: 'Water' },
    { key: 'weight' as const, label: 'Weight' },
    { key: 'workout' as const, label: 'Workouts' },
    { key: 'sleep' as const, label: 'Sleep' },
  ];

  const activeItems = items.filter((item) => streaks.current[item.key] > 0);

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <div className="glass-card flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Active streaks
        </p>
      </div>
      <div className="mt-1 flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
        {activeItems.map((item) => (
          <div key={item.key} className="min-w-[150px] max-w-[180px] flex-1">
            <StreakCard
              label={item.label}
              current={streaks.current[item.key]}
              best={streaks.best[item.key]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

