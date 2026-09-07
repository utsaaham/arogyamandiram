'use client';

import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CURRENT_DASHBOARD_TOUR_VERSION } from '@/lib/constants';
import { OrchestratorSidebarProvider, useOrchestratorSidebar } from '@/contexts/OrchestratorSidebarContext';
import { UserProvider, useUserContext } from '@/contexts/UserContext';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import OrchestratorSidebar from '@/components/layout/OrchestratorSidebar';
import OrchestratorToggleButton from '@/components/layout/OrchestratorToggleButton';
import DashboardTour from '@/components/tour/DashboardTour';
import GuestUpgradeBanner from '@/components/layout/GuestUpgradeBanner';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const { user, loading: userLoading } = useUserContext();
  const router = useRouter();
  const pathname = usePathname();
  const [showTour, setShowTour] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isXl, setIsXl] = useState(false);
  const { isOpen: rightOpen, sidebarWidth, setSidebarWidth, closeSidebar } = useOrchestratorSidebar();
  const wasCollapsedRef = useRef<boolean | null>(null);
  const aiEnabled = user?.settings?.aiEnabled !== false;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const update = (matches: boolean) => {
      setIsXl(matches);
      setSidebarWidth(matches ? 464 : 360);
    };
    update(mq.matches);
    const handler = (e: MediaQueryListEvent) => update(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setSidebarWidth]);

  // On tablet (< xl): auto-collapse left sidebar when right sidebar opens, restore on close
  useEffect(() => {
    if (!isXl) {
      if (rightOpen) {
        wasCollapsedRef.current = sidebarCollapsed;
        setSidebarCollapsed(true);
      } else if (wasCollapsedRef.current !== null) {
        setSidebarCollapsed(wasCollapsedRef.current);
        wasCollapsedRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightOpen, isXl]);

  useEffect(() => {
    if (session?.authError === 'SessionRevoked') {
      void signOut({ callbackUrl: '/login' });
      return;
    }
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session?.authError, status, router]);

  useEffect(() => {
    if (!user) return;

    if (user.isGuest) setIsGuest(true);

    if (!user.onboardingComplete) {
      router.push('/onboarding');
      return;
    }

    const storedVersion = user.settings?.dashboardTourVersion ?? 0;
    const envVersion = CURRENT_DASHBOARD_TOUR_VERSION;

    if (typeof window !== 'undefined') {
      const seenKey = 'dashboardTourSeenVersion';
      const alreadySeenSession =
        window.sessionStorage.getItem(seenKey) === String(envVersion);

      if (storedVersion >= envVersion || alreadySeenSession) {
        setShowTour(false);
      } else {
        window.sessionStorage.setItem(seenKey, String(envVersion));
        void api.updateSettings({ dashboardTourVersion: envVersion });
        setShowTour(true);
      }
    }
  }, [user, router]);

  // Ensure each dashboard page starts scrolled to top (especially on mobile)
  useEffect(() => {
    const viewport = document.querySelector<HTMLElement>('.app-viewport');
    if (viewport) {
      viewport.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [pathname]);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    if (!aiEnabled) closeSidebar();
  }, [aiEnabled, closeSidebar]);

  if (status === 'loading' || userLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))' }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-emerald border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const isFullViewport = pathname === '/ai' || pathname === '/settings';

  return (
    <div
      className={cn(
        'app-viewport hide-scrollbar fixed inset-0 overflow-x-hidden overscroll-y-contain',
        !isFullViewport && 'overflow-y-auto',
        isFullViewport && 'flex flex-col',
      )}
    >
      <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <MobileNav />
      <main
        className={cn(
          'transition-[padding-left] duration-300',
          isFullViewport ? 'h-full flex flex-col' : 'min-h-full pb-[max(3.25rem,calc(var(--sab,env(safe-area-inset-bottom,0px))+2.5rem))] lg:pb-0 lg:pt-0',
          sidebarCollapsed ? 'lg:pl-[64px] sidebar-collapsed' : 'lg:pl-[232px]',
        )}
        style={{ paddingRight: !isFullViewport && aiEnabled && rightOpen ? `${sidebarWidth}px` : undefined }}
      >
        {isFullViewport ? (
          children
        ) : (
          <div
            className="w-full max-w-full overflow-x-hidden px-4 pt-3 pb-0 sm:px-6 sm:pt-8 sm:pb-4 lg:px-6 lg:pt-8"
            style={{ paddingTop: 'calc(var(--sat, env(safe-area-inset-top, 0px)) + 0.75rem)' }}
          >
            <GuestUpgradeBanner isGuest={isGuest} />
            {showTour && <DashboardTour onClose={() => setShowTour(false)} />}
            {children}
          </div>
        )}
      </main>
      {!isFullViewport && aiEnabled && <OrchestratorToggleButton />}
      {!isFullViewport && aiEnabled && <OrchestratorSidebar />}
    </div>
  );
}

export default function DashboardLayoutClient({ children }: { children: ReactNode }) {
  return (
    <OrchestratorSidebarProvider>
      <UserProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </UserProvider>
    </OrchestratorSidebarProvider>
  );
}
