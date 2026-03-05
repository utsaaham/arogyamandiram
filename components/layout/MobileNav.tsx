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

/**
 * On iOS Safari, when the bottom toolbar (share, add to home screen) hides,
 * the visual viewport grows but the layout viewport doesn't update, so
 * position: fixed; bottom: 0 leaves a gap. We use the Visual Viewport API
 * to push the nav down so it always sits at the visible bottom.
 */
function useVisualViewportBottomOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
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
        paddingBottom: 'clamp(0.5rem, env(safe-area-inset-bottom), 1.25rem)',
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
