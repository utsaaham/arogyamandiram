'use client';

import { cn } from '@/lib/utils';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
  bgColor: string;
}

export default function MacroBar({
  label,
  current,
  target,
  unit = 'g',
  color,
  bgColor,
}: MacroBarProps) {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className="text-xs text-text-muted">
          <span className="font-semibold text-text-primary">{Math.round(current)}</span>
          <span className="mx-0.5">/</span>
          {Math.round(target)}{unit}
        </span>
      </div>
      <div className={cn('h-2 w-full overflow-hidden rounded-full', bgColor)}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
