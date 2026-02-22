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
}: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      className={cn(
        'glass-card flex items-start gap-4 rounded-2xl p-4 text-left transition-all duration-200',
        onClick && 'cursor-pointer hover:border-white/[0.08] hover:bg-bg-hover',
        className
      )}
      onClick={onClick}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-text-primary">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
        {trend && (
          <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-accent-emerald' : 'text-accent-rose')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
