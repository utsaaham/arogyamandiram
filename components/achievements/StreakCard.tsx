'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakCardProps {
  label: string;
  current: number;
  best?: number;
}

export function StreakCard({ label, current, best }: StreakCardProps) {
  const active = current > 0;

  return (
    <div
      className={cn(
        'glass-card flex h-16 items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200 sm:h-14 sm:gap-2 sm:p-2.5',
        active && 'border border-accent-amber/40 bg-white/[0.02]'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 flex-none items-center justify-center rounded-xl sm:h-8 sm:w-8 sm:rounded-lg',
          active ? 'bg-accent-amber/15 text-accent-amber' : 'bg-white/[0.04] text-text-muted opacity-60'
        )}
      >
        <Flame className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium leading-tight text-text-muted sm:text-xs">
          {label}
        </p>
        <p className="text-[11px] font-semibold leading-tight text-text-primary sm:text-sm">
          {current} day{current === 1 ? '' : 's'}
          {best != null && best > 0 && (
            <span className="ml-1 text-[8px] text-text-muted sm:text-[10px]">• Best {best}d</span>
          )}
        </p>
      </div>
    </div>
  );
}

