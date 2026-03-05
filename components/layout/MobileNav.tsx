'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

/** True when app is launched from home screen (PWA standalone). No Safari chrome. */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = navigator as { standalone?: boolean };
  return Boolean(nav.standalone);
}

/**
 * On iOS Safari (in-browser only), when the bottom toolbar hides, the visual
 * viewport grows but the layout viewport doesn't update, so we push the nav
 * down. In standalone (add-to-home-screen) we use no offset so the nav stays
 * flush at the bottom.
 */
function useVisualViewportBottomOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (isStandalone()) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const layoutBottom = window.innerHeight;
      const visualBottom = vv.offsetTop + vv.height;
      const gap = Math.max(0, visualBottom - layoutBottom);
      setOffset(gap);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return offset;
}

export default function MobileNav() {
  const pathname = usePathname();
  const visualViewportOffset = useVisualViewportBottomOffset();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-bg-surface/95 backdrop-blur-xl lg:hidden"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        transform: visualViewportOffset > 0 ? `translateY(${visualViewportOffset}px)` : undefined,
      }}
    >
      <div className="flex items-center justify-around py-2">
        {mobileNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 items-center justify-center py-2 transition-colors',
                isActive ? 'text-accent-violet' : 'text-text-muted'
              )}
            >
              <item.icon
                aria-label={item.label}
                className={cn('h-5 w-5', isActive && 'text-accent-violet')}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
