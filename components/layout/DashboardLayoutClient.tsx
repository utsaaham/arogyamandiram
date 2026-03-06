'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { CURRENT_DASHBOARD_TOUR_VERSION } from '@/lib/constants';
import { DebugLogsProvider } from '@/contexts/DebugLogsContext';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import DashboardTour from '@/components/tour/DashboardTour';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';

export default function DashboardLayoutClient({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      api
        .getUser()
        .then((res) => {
          if (res.success && res.data) {
            const user = res.data as {
              onboardingComplete?: boolean;
              settings?: {
                dashboardTourVersion?: number;
              };
            };

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
                // Already seen this version; never show again unless env version increases.
                setShowTour(false);
              } else {
                // Mark as seen immediately in DB and this browser session, then show once.
                window.sessionStorage.setItem(seenKey, String(envVersion));
                void api.updateSettings({ dashboardTourVersion: envVersion });
                setShowTour(true);
              }
            }
          }
          setCheckingOnboarding(false);
        })
        .catch(() => setCheckingOnboarding(false));
    }
  }, [status, router]);

  if (status === 'loading' || checkingOnboarding) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))' }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      className="app-viewport hide-scrollbar fixed inset-0 overflow-y-auto overscroll-behavior-y-contain"
      style={{
        paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))',
        paddingLeft: 'var(--sal, env(safe-area-inset-left, 0px))',
        paddingRight: 'var(--sar, env(safe-area-inset-right, 0px))',
      }}
    >
      <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <MobileNav />
      <main
        className={cn(
          'min-h-full pb-[max(5.5rem,calc(var(--sab,env(safe-area-inset-bottom,0px))+4rem))] lg:pb-0 lg:pt-0 transition-[padding-left] duration-300',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'
        )}
      >
        <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 lg:px-8">
          {showTour && <DashboardTour onClose={() => setShowTour(false)} />}
          <DebugLogsProvider>{children}</DebugLogsProvider>
        </div>
      </main>
    </div>
  );
}

