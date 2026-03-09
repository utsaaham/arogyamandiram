'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Moon,
  Droplets,
  Utensils,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/water', icon: Droplets, label: 'Water' },
  { href: '/food', icon: Utensils, label: 'Food' },
  { href: '/more', icon: MoreHorizontal, label: 'More' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] lg:hidden"
      style={{
        background: '#0D0D14',
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
      </div>
    </nav>
  );
}
