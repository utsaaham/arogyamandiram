'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

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
}: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      className={cn(
        'glass-card flex items-start text-left transition-all duration-200',
        compact ? 'gap-2.5 rounded-xl p-2.5' : 'gap-4 rounded-2xl p-4',
        onClick && 'cursor-pointer hover:border-white/[0.08] hover:bg-bg-hover',
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-white/[0.04]',
          compact ? 'h-8 w-8 rounded-md' : 'h-10 w-10 rounded-xl',
          iconColor
        )}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        {label ? <p className={cn('m-0 font-medium leading-tight text-text-muted', compact ? 'text-[10px]' : 'text-xs')}>{label}</p> : null}
        <p className={cn('m-0 font-bold leading-tight text-text-primary', compact ? 'text-sm' : 'text-xl')}>{value}</p>
        {subtitle ? <p className={cn('m-0 leading-tight text-text-muted break-words', compact ? 'text-[10px]' : 'text-xs')}>{subtitle}</p> : null}
        {trend && (
          <p className={cn('m-0 pt-0.5 text-xs font-medium leading-tight', trend.positive ? 'text-accent-emerald' : 'text-accent-rose')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
