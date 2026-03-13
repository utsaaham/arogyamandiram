'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutGrid,
  Moon,
  Droplets,
  Utensils,
  Scale,
  Dumbbell,
  Star,
  Sparkles,
  Key,
  Target,
  Bell,
  Settings,
  Code2,
  LogOut,
  ChevronLeft,
  Bug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const mainNavItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Home' },
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/water', icon: Droplets, label: 'Water' },
  { href: '/food', icon: Utensils, label: 'Food' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/weight', icon: Scale, label: 'Weight' },
  { href: '/achievements', icon: Star, label: 'Achievements' },
  { href: '/ai-insights', icon: Sparkles, label: 'Insights' },
];

const extraNavItems = [
  { href: '/api-keys', icon: Key, label: 'API Keys' },
  { href: '/targets', icon: Target, label: 'Targets' },
  { href: '/preferences', icon: Bell, label: 'Preferences' },
];

const debugNavItem = { href: '/debug', icon: Bug, label: 'Debugger' };
const allExtraItems =
  process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
    ? [...extraNavItems, debugNavItem]
    : extraNavItems;

type SidebarProps = {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export default function Sidebar({ collapsed: controlledCollapsed, onCollapsedChange }: SidebarProps = {}) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = onCollapsedChange ? (controlledCollapsed ?? internalCollapsed) : internalCollapsed;
  const setCollapsed = onCollapsedChange
    ? (value: boolean) => onCollapsedChange(value)
    : setInternalCollapsed;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen-safe flex-col transition-all duration-300 lg:flex',
        collapsed ? 'w-[64px]' : 'w-[232px]'
      )}
      style={{ background: 'rgba(8, 14, 10, 0.88)', boxShadow: '2px 0 32px rgba(30,221,139,0.07)', paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))' }}
    >
      {/* Logo */}
      <div className="shrink-0 px-[18px] pb-3 pt-5">
        <div
          className={cn(
            'font-bold tracking-[0.08em] leading-tight',
            collapsed ? 'text-center text-xs text-accent-emerald' : 'text-[15px]'
          )}
        >
          {collapsed ? (
            'AM'
          ) : (
            <>
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300 bg-clip-text text-transparent">
                AROGYAMANDIRAM
              </span>
              <small className="mt-0.5 block font-normal text-[9px] uppercase tracking-[0.12em] text-zinc-400">
                Health & Wellness
              </small>
            </>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-0 py-0">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-xl py-2 text-[13px] font-medium transition-all duration-150',
                collapsed ? 'mx-1.5 justify-center px-0' : 'mx-2 gap-2.5 justify-start px-3',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn('h-[15px] w-[15px] shrink-0', isActive && 'text-emerald-400')}
                strokeWidth={1.8}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {allExtraItems.length > 0 && (
          <>
            {allExtraItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-xl py-2 text-[13px] font-medium transition-all duration-150',
                    collapsed ? 'mx-1.5 justify-center px-0' : 'mx-2 gap-2.5 justify-start px-3',
                    isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                className={cn('h-[15px] w-[15px] shrink-0', isActive && 'text-emerald-400')}
                    strokeWidth={1.8}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom: Project, Settings, Sign Out, Collapse */}
      <div className="shrink-0 px-0 py-2 pt-2">
        <div className="mt-1.5 space-y-0.5">
          <Link
            href="/project"
            className={cn(
              'flex items-center rounded-xl py-2 text-[13px] font-medium transition-all duration-150',
              collapsed ? 'mx-1.5 justify-center px-0' : 'mx-2 gap-2.5 justify-start px-3',
              pathname === '/project' || pathname.startsWith('/project/')
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
            )}
            title={collapsed ? 'Project' : undefined}
          >
            <Code2
              className={cn(
                'h-[15px] w-[15px] shrink-0',
                pathname === '/project' || pathname.startsWith('/project/')
                  ? 'text-emerald-400'
                  : undefined
              )}
              strokeWidth={1.8}
            />
            {!collapsed && <span>Project</span>}
          </Link>
          <Link
            href="/settings"
            className={cn(
              'flex items-center rounded-xl py-2 text-[13px] font-medium transition-all duration-150',
              collapsed ? 'mx-1.5 justify-center px-0' : 'mx-2 gap-2.5 justify-start px-3',
              pathname === '/settings' || pathname.startsWith('/settings/')
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
            )}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings
              className={cn(
                'h-[15px] w-[15px] shrink-0',
                pathname === '/settings' || pathname.startsWith('/settings/')
                  ? 'text-emerald-400'
                  : undefined
              )}
              strokeWidth={1.8}
            />
            {!collapsed && <span>Settings</span>}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={cn(
              'flex items-center rounded-xl py-2 text-[13px] font-medium transition-all duration-150',
              collapsed ? 'mx-1.5 w-[calc(100%-0.75rem)] justify-center px-0' : 'mx-2 w-[calc(100%-1rem)] gap-2.5 justify-start px-3',
              'text-rose-400 hover:bg-white/[0.04] hover:text-rose-300'
            )}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          type="button"
          className="mt-2 flex w-full items-center justify-center rounded-xl p-2 text-text-muted hover:bg-white/[0.04]"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
          />
        </button>
      </div>
    </aside>
  );
}
