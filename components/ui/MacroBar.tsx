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
        <span className="text-xs font-medium text-neutral-400">{label}</span>
        <span className="text-xs text-neutral-400">
          <span className="font-semibold text-orange-400">{Math.round(current)}</span>
          <span className="mx-0.5 text-neutral-500">/</span>
          <span className="text-neutral-300">
            {Math.round(target)}
            {unit}
          </span>
        </span>
      </div>
      <div
        className={cn(
          'h-2 w-full overflow-hidden rounded-full bg-neutral-800/80',
          bgColor
        )}
        aria-hidden="true"
      >
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.25)] transition-all duration-700 ease-out',
            color
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="sr-only">
        {label} {Math.round(current)} of {Math.round(target)}
        {unit}
      </span>
    </div>
  );
}
