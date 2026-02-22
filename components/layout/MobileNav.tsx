'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  Droplets,
  Dumbbell,
  Moon,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/food', icon: Utensils, label: 'Food' },
  { href: '/water', icon: Droplets, label: 'Water' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/sleep', icon: Moon, label: 'Sleep' },
  { href: '/settings', icon: Settings, label: 'More' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-bg-surface/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around py-2">
        {mobileNav.map((item) => {
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
      </div>
    </nav>
  );
}
