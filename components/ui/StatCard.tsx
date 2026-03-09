'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Map iconColor (e.g. text-accent-violet) to icon bg class (e.g. bg-accent-violet/15)
function iconBgFromColor(iconColor: string): string {
  if (iconColor.includes('accent-violet')) return 'bg-accent-violet/15';
  if (iconColor.includes('accent-emerald')) return 'bg-accent-emerald/15';
  if (iconColor.includes('accent-cyan')) return 'bg-accent-cyan/15';
  if (iconColor.includes('accent-amber')) return 'bg-accent-amber/15';
  if (iconColor.includes('accent-rose')) return 'bg-accent-rose/15';
  if (iconColor.includes('accent-pink')) return 'bg-accent-pink/15';
  return 'bg-white/[0.04]';
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  iconColor?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
  onClick?: () => void;
  /** Smaller variant for dense grids (e.g. project feature cards) */
  compact?: boolean;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconColor = 'text-accent-violet',
  trend,
  className,
  onClick,
  compact = false,
  // Optional visual variant; 'workout' uses the deep red workout palette.
  variant = 'default',
}: StatCardProps & { variant?: 'default' | 'workout' }) {
  const Wrapper = onClick ? 'button' : 'div';
  const iconBg = iconBgFromColor(iconColor);
  const isWorkout = variant === 'workout';

  return (
    <Wrapper
      className={cn(
        'flex items-start text-left transition-all duration-200',
        isWorkout
          ? 'relative rounded-2xl bg-workout-bg text-text-primary shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
          : 'glass-card',
        compact ? 'gap-2.5 rounded-xl p-2.5' : 'gap-4 rounded-2xl p-4',
        onClick && !isWorkout && 'cursor-pointer hover:border-white/[0.08] hover:bg-bg-hover',
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center',
          iconBg,
          compact ? 'h-8 w-8 rounded-md' : 'h-10 w-10 rounded-xl',
          iconColor
        )}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        {label ? (
          <p
            className={cn(
              'm-0 font-medium leading-tight',
              isWorkout ? 'text-workout-label' : 'text-text-muted',
              compact ? 'text-[10px]' : 'text-xs',
            )}
          >
            {label}
          </p>
        ) : null}
        <p className={cn('m-0 font-bold leading-tight text-text-primary', compact ? 'text-sm' : 'text-xl')}>{value}</p>
        {subtitle ? (
          <p
            className={cn(
              'm-0 leading-tight break-words',
              isWorkout ? 'text-workout-label' : 'text-text-muted',
              compact ? 'text-[10px]' : 'text-xs',
            )}
          >
            {subtitle}
          </p>
        ) : null}
        {trend && (
          <p className={cn('m-0 pt-0.5 text-xs font-medium leading-tight', trend.positive ? 'text-accent-emerald' : 'text-accent-rose')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
