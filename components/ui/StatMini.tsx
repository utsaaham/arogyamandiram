'use client';

import { cn } from '@/lib/utils';

export interface StatMiniProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
  valueColor: string;
  iconBg: string;
  compact?: boolean;
  tiny?: boolean;
  /** Mobile: value on first line, label on second line; smaller text, aligned */
  stackLabel?: boolean;
}

export default function StatMini({
  icon,
  value,
  label,
  sub,
  valueColor,
  iconBg,
  compact,
  tiny,
  stackLabel,
}: StatMiniProps) {
  const iconBox = tiny ? 'h-9 w-9' : compact ? 'h-11 w-11' : 'h-12 w-12';
  const valueSize = stackLabel ? 'text-lg' : tiny ? 'text-base' : compact ? 'text-xl' : 'text-2xl';
  const labelSize = stackLabel ? 'text-[11px]' : tiny ? 'text-[10px]' : compact ? 'text-xs' : 'text-sm';
  const subSize = stackLabel ? 'text-[10px]' : tiny ? 'text-[9px]' : compact ? 'text-[10px]' : 'text-xs';
  return (
    <div className={cn('stat-mini-card', tiny && 'stat-mini-card-tiny')}>
      <div className={cn('stat-mini-icon', iconBg, iconBox)}>
        {icon}
      </div>
      <div className="stat-mini-content min-w-0">
        {stackLabel ? (
          <div className="flex flex-col items-start gap-0.5 leading-tight">
            <span className={cn('font-heading font-semibold', valueColor, valueSize)}>{value}</span>
            <span className={cn('font-body font-medium text-text-primary', labelSize)}>{label}</span>
          </div>
        ) : (
          <div className="leading-none tracking-tight">
            <span className={cn('font-heading font-semibold', valueColor, valueSize)}>{value}</span>
            <span className={cn('font-body font-medium text-text-primary ml-1.5', labelSize)}>{label}</span>
          </div>
        )}
        <div className={cn('font-body text-text-muted/90 mt-0.5', subSize)}>{sub}</div>
      </div>
    </div>
  );
}
