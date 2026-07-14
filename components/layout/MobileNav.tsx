'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Moon,
  Droplets,
  Utensils,
  Dumbbell,
  Scale,
  Star,
  CheckSquare,
  Sparkles,
  Settings,
  Link2,
  Code2,
  MoreHorizontal,
  X,
  LogOut,
} from 'lucide-react';
import VitalsIcon from '@/components/ui/VitalsIcon';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { signOut } from 'next-auth/react';

const mobileNav = [
  { href: '/home', icon: LayoutDashboard, label: 'Home' },
  { href: '/vitals', icon: VitalsIcon, label: 'Stats' },
  { href: '/coach', icon: Sparkles, label: 'Ciel' },
  { href: '/water', icon: Droplets, label: 'Water' },
];

const moreNav = [
  { href: '/todays-plan', icon: CheckSquare, label: 'Checklist' },
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/food', icon: Utensils, label: 'Food' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/weight', icon: Scale, label: 'Weight' },
  { href: '/achievements', icon: Star, label: 'Achievements' },
  { href: '/settings?tab=health-data', icon: Link2, label: 'Health Sync' },
  { href: '/project', icon: Code2, label: 'Project' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreNav.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <>
      {/* More sheet */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-[48] bg-black/40"
            onClick={() => setShowMore(false)}
          />
          <div
            className="fixed bottom-[calc(var(--sab,env(safe-area-inset-bottom,0px))+3.25rem)] left-0 right-0 z-[49] rounded-t-2xl border-t border-white/[0.06] px-4 py-4 grid grid-cols-4 gap-3"
            style={{ background: 'linear-gradient(160deg, #111712 0%, #0c1410 100%)' }}
          >
            {moreNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className="flex flex-col items-center gap-1.5 py-2"
                >
                  <item.icon
                    className={cn('h-5 w-5', isActive ? 'text-emerald-400' : 'text-zinc-400')}
                  />
                  <span className={cn('text-[11px]', isActive ? 'text-emerald-400' : 'text-zinc-500')}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex flex-col items-center gap-1.5 py-2"
            >
              <LogOut className="h-5 w-5 text-red-400" />
              <span className="text-[11px] text-red-400">Logout</span>
            </button>
          </div>
        </>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] lg:hidden"
        style={{
          background: 'linear-gradient(160deg, #111712 0%, #0c1410 100%)',
          paddingBottom: 'var(--sab, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-center justify-around py-1.5">
          {mobileNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 items-center justify-center py-2 transition-colors',
                  isActive ? 'text-emerald-400' : 'text-zinc-400'
                )}
              >
                <item.icon
                  aria-label={item.label}
                  className={cn('h-5 w-5', isActive && 'text-emerald-400')}
                />
              </Link>
            );
          })}

          <button
            onClick={() => setShowMore((v) => !v)}
            className={cn(
              'flex flex-1 items-center justify-center py-2 transition-colors',
              showMore || isMoreActive ? 'text-emerald-400' : 'text-zinc-400'
            )}
          >
            {showMore ? (
              <X className="h-5 w-5" />
            ) : (
              <MoreHorizontal className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
