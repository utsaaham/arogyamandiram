'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Moon,
  Droplets,
  Utensils,
  Scale,
  Dumbbell,
  Trophy,
  Key,
  Target,
  Bell,
  Settings,
  Code2,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/water', icon: Droplets, label: 'Water' },
  { href: '/food', icon: Utensils, label: 'Food' },
  { href: '/weight', icon: Scale, label: 'Weight' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/achievements', icon: Trophy, label: 'Achievements' },
  { href: '/api-keys', icon: Key, label: 'API Keys' },
  { href: '/targets', icon: Target, label: 'Targets' },
  { href: '/preferences', icon: Bell, label: 'Preferences' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/[0.04] bg-bg-surface/80 backdrop-blur-xl transition-all duration-300 lg:flex',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Nav Items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-accent-violet/10 text-accent-violet'
                  : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-accent-violet')} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Project + Settings + Sign Out + Collapse */}
      <div className="border-t border-white/[0.04] p-3">
        <Link
          href="/project"
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
            pathname === '/project' || pathname.startsWith('/project/')
              ? 'bg-accent-violet/10 text-accent-violet'
              : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary'
          )}
          title={collapsed ? 'Project' : undefined}
        >
          <Code2 className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Project</span>}
        </Link>
        <Link
          href="/settings"
          className={cn(
            'mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
            pathname === '/settings' || pathname.startsWith('/settings/')
              ? 'bg-accent-violet/10 text-accent-violet'
              : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition-all hover:bg-white/[0.04] hover:text-accent-rose"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
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
