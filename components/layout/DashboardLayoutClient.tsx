'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import DashboardTour from '@/components/tour/DashboardTour';
import api from '@/lib/apiClient';

export default function DashboardLayoutClient({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showTour, setShowTour] = useState(false);

  const forceTour = searchParams?.get('tour') === '1';

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
            const user = res.data as { onboardingComplete?: boolean };
            if (!user.onboardingComplete && !forceTour) {
              router.push('/onboarding');
              return;
            }
            setShowTour(true);
          }
          setCheckingOnboarding(false);
        })
        .catch(() => setCheckingOnboarding(false));
    }
  }, [status, router, forceTour]);

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
      <main className="min-h-full pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4rem))] pt-[env(safe-area-inset-top)] lg:pl-[240px] lg:pb-0 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {showTour && <DashboardTour onClose={() => setShowTour(false)} />}
          {children}
        </div>
      </main>
    </div>
  );
}

