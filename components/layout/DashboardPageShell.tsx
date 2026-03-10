'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileHeaderVariant = 'card' | 'minimal';

interface DashboardPageShellProps {
  /** Page title (e.g. "Sleep Tracker", "Water") */
  title: string;
  /** Subtitle or date line */
  subtitle?: string;
  /** Optional icon shown next to title on desktop */
  icon?: LucideIcon;
  iconClassName?: string;
  /** Right-side content on desktop (e.g. level/XP pill) */
  rightDesktop?: React.ReactNode;
  /** Mobile header: card = TopBar-style dark card, minimal = title + subtitle only */
  mobileVariant?: MobileHeaderVariant;
  /** Optional extra block inside mobile card (e.g. XP bar) */
  mobileExtra?: React.ReactNode;
  /** Optional extra classes for the mobile header card (card variant only) */
  mobileCardClassName?: string;
  /** Additional class for the desktop header row */
  className?: string;
  /** Optional class override for the title text (desktop + mobile) */
  titleClassName?: string;
  /** Optional class override for the subtitle text (desktop + mobile) */
  subtitleClassName?: string;
  /** Children: desktop and mobile content. Use same children for both; shell only renders header. */
  children?: React.ReactNode;
}

/**
 * Shared page shell for dashboard-style pages.
 * Desktop: top row with font-heading title + optional right pill.
 * Mobile: optional TopBar-style header card or minimal title block.
 */
export default function DashboardPageShell({
  title,
  subtitle,
  icon: Icon,
  iconClassName = 'text-accent-violet',
  rightDesktop,
  mobileVariant = 'card',
  mobileExtra,
  mobileCardClassName,
  titleClassName,
  subtitleClassName,
  className,
  children,
}: DashboardPageShellProps) {
  return (
    <>
      {/* Desktop header (lg+) */}
      <div className={cn('hidden lg:flex flex-wrap items-start justify-between gap-4', className)}>
        <div>
          <h1
            className={cn(
              'font-heading text-[32px] font-normal tracking-[0.03em] leading-none text-text-primary flex items-center gap-2',
              titleClassName
            )}
          >
            {Icon && <Icon className={cn('h-7 w-7 shrink-0', iconClassName)} />}
            <span>{title}</span>
          </h1>
          {subtitle != null && (
            <p
              className={cn(
                'font-body mt-1.5 text-[13px] text-text-muted',
                subtitleClassName
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {rightDesktop != null && (
          <div className="flex shrink-0 items-center gap-2.5">{rightDesktop}</div>
        )}
      </div>

      {/* Mobile header */}
      <div className={cn('mobile-fade-up mobile-dash-px pt-0 pb-3 lg:hidden')} style={{ animationDelay: '0ms' }}>
        {mobileVariant === 'card' ? (
          <div className={cn('dashboard-page-header-card', mobileCardClassName)}>
            <div className="flex items-center gap-3">
              {Icon && <Icon className={cn('h-10 w-10 shrink-0', iconClassName)} />}
              <div className="flex flex-col">
                <p
                  className={cn(
                    'm-0 text-white text-[22px] font-extrabold leading-tight',
                    titleClassName
                  )}
                  style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}
                >
                  {title}
                </p>
                {subtitle != null && (
                  <p
                    className={cn(
                      'mt-1 text-[11px] text-white',
                      subtitleClassName
                    )}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {mobileExtra != null && (
              <>
                <div className="h-px bg-white/[0.06] mt-3 mb-3" />
                {mobileExtra}
              </>
            )}
          </div>
        ) : (
          <div>
            <h1
              className={cn(
                'font-heading text-2xl font-normal tracking-tight text-text-primary flex items-center gap-3',
                titleClassName
              )}
            >
              {Icon && <Icon className={cn('h-8 w-8 shrink-0', iconClassName)} />}
              <span>{title}</span>
            </h1>
            {subtitle != null && (
              <p
                className={cn(
                  'mt-1 text-sm text-text-muted',
                  subtitleClassName
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {children}
    </>
  );
}
