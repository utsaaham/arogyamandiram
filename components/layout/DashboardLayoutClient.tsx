'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { CURRENT_DASHBOARD_TOUR_VERSION } from '@/lib/constants';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import DashboardTour from '@/components/tour/DashboardTour';
import api from '@/lib/apiClient';

export default function DashboardLayoutClient({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showTour, setShowTour] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="hide-scrollbar fixed inset-0 overflow-y-auto overscroll-behavior-y-contain">
      <Sidebar />
      <MobileNav />
      <main className="min-h-full pb-[max(5rem,calc(env(safe-area-inset-bottom)+3.75rem))] pt-[env(safe-area-inset-top)] lg:pl-[240px] lg:pb-0 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {showTour && <DashboardTour onClose={() => setShowTour(false)} />}
          {children}
        </div>
      </main>
    </div>
  );
}

