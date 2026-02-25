'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  Moon,
  Scale,
  Sparkles,
  Trophy,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const moreItems: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/weight', icon: Scale, label: 'Weight' },
  { href: '/ai-insights', icon: Sparkles, label: 'AI Insights' },
  { href: '/achievements', icon: Trophy, label: 'Achievements' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function MorePage() {
  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">More</h1>
        <p className="mt-1 text-sm text-text-muted">Quick access to extra tools</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {moreItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-bg-surface p-6 text-text-muted transition-colors',
              'hover:bg-white/[0.04] hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-surface'
            )}
          >
            <item.icon className="h-10 w-10 shrink-0" />
            <span className="text-center text-sm font-medium">{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-bg-surface p-6 text-text-muted transition-colors',
            'hover:bg-white/[0.04] hover:text-accent-rose focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-surface'
          )}
        >
          <LogOut className="h-10 w-10 shrink-0" />
          <span className="text-center text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
