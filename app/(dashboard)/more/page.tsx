'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  Scale,
  Dumbbell,
  Moon,
  Trophy,
  Key,
  Target,
  Bell,
  Settings,
  Code2,
  LogOut,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MoreItemTheme =
  | 'workout'
  | 'weight'
  | 'sleep'
  | 'achievements'
  | 'insights'
  | 'apiKeys'
  | 'targets'
  | 'preferences'
  | 'project'
  | 'settings';

const moreItems: { href: string; icon: LucideIcon; label: string; theme: MoreItemTheme }[] = [
  { href: '/workout', icon: Dumbbell, label: 'Workout', theme: 'workout' },
  { href: '/weight', icon: Scale, label: 'Weight', theme: 'weight' },
  { href: '/sleep', icon: Moon, label: 'Sleep', theme: 'sleep' },
  { href: '/achievements', icon: Trophy, label: 'Achievements', theme: 'achievements' },
  { href: '/ai-insights', icon: Sparkles, label: 'Insights', theme: 'insights' },
  { href: '/api-keys', icon: Key, label: 'API Keys', theme: 'apiKeys' },
  { href: '/targets', icon: Target, label: 'Targets', theme: 'targets' },
  { href: '/preferences', icon: Bell, label: 'Preferences', theme: 'preferences' },
  { href: '/project', icon: Code2, label: 'Project', theme: 'project' },
  { href: '/settings', icon: Settings, label: 'Settings', theme: 'settings' },
];

export default function MorePage() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const hiddenOnMobile = ['/sleep', '/api-keys', '/targets', '/preferences'];
  const items = isMobile ? moreItems.filter((item) => !hiddenOnMobile.includes(item.href)) : moreItems;

  return (
    <div className="space-y-3 pb-24 lg:space-y-6 lg:pb-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">More</h1>
        <p className="mt-1 text-sm text-text-muted">Quick access to extra tools</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-text-muted transition-colors more-card',
              item.theme === 'workout' && 'more-card-workout',
              item.theme === 'weight' && 'more-card-weight',
              item.theme === 'sleep' && 'more-card-sleep',
              item.theme === 'achievements' && 'more-card-achievements',
              item.theme === 'insights' && 'more-card-insights',
              item.theme === 'apiKeys' && 'more-card-api',
              item.theme === 'targets' && 'more-card-targets',
              item.theme === 'preferences' && 'more-card-preferences',
              item.theme === 'project' && 'more-card-project',
              item.theme === 'settings' && 'more-card-settings',
              'hover:text-text-primary focus:outline-none'
            )}
          >
            <item.icon className="h-10 w-10 shrink-0 text-white" />
            <span className="text-center text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
          // Destructive / sign-out style: vivid rose button
          'border-accent-rose/40 bg-accent-rose/15 text-accent-rose',
          'hover:bg-accent-rose/25 hover:border-accent-rose/60 hover:text-white',
          'focus:outline-none focus:ring-2 focus:ring-accent-rose/50 focus:ring-offset-2 focus:ring-offset-bg-surface'
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign Out
      </button>
    </div>
  );
}
