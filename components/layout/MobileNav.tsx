'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Utensils,
  Droplets,
  Dumbbell,
  MoreHorizontal,
  Moon,
  Scale,
  Sparkles,
  Trophy,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const primaryNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/food', icon: Utensils, label: 'Food' },
  { href: '/water', icon: Droplets, label: 'Water' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
];

const moreSheetItems = [
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/weight', icon: Scale, label: 'Weight' },
  { href: '/ai-insights', icon: Sparkles, label: 'AI Insights' },
  { href: '/achievements', icon: Trophy, label: 'Achievements' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const morePaths = moreSheetItems.map((item) => item.href);

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive =
    moreOpen || morePaths.some((path) => pathname === path || pathname.startsWith(path + '/'));

  const handleMoreLinkClick = () => {
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-bg-surface/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-around py-2">
          {primaryNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors',
                  isActive ? 'text-accent-violet' : 'text-text-muted'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-accent-violet')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors',
              isMoreActive ? 'text-accent-violet' : 'text-text-muted'
            )}
            aria-label="More menu"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal className={cn('h-5 w-5', isMoreActive && 'text-accent-violet')} />
            <span>More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="more-backdrop"
            role="button"
            tabIndex={0}
            aria-label="Close more menu"
            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMoreOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMoreOpen(false);
            }}
          />
        )}
        {moreOpen && (
          <motion.div
            key="more-sheet"
            role="dialog"
            aria-label="More menu"
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-white/[0.06] bg-bg-surface shadow-xl lg:hidden"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="flex justify-center py-2">
              <div className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
            </div>
            <nav className="px-4 pb-4">
              <ul className="space-y-1">
                {moreSheetItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={handleMoreLinkClick}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-accent-violet/10 text-accent-violet'
                            : 'text-text-muted hover:bg-white/[0.04]'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  signOut({ callbackUrl: '/login' });
                }}
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-accent-rose"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Sign Out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
