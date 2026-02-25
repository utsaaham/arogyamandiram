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
        'glass-card flex items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200',
        active && 'border border-accent-amber/40 bg-white/[0.02]'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          active ? 'bg-accent-amber/15 text-accent-amber' : 'bg-white/[0.04] text-text-muted opacity-60'
        )}
      >
        <Flame className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className="text-sm font-semibold text-text-primary">
          {current} day{current === 1 ? '' : 's'}
          {best != null && best > 0 && (
            <span className="ml-1 text-[10px] text-text-muted">• Best {best}d</span>
          )}
        </p>
      </div>
    </div>
  );
}

