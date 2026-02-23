'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import api from '@/lib/apiClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      // Check if onboarding is complete
      api.getUser().then((res) => {
        if (res.success && res.data) {
          const user = res.data as { onboardingComplete?: boolean };
          if (!user.onboardingComplete) {
            router.push('/onboarding');
            return;
          }
        }
        setCheckingOnboarding(false);
      }).catch(() => setCheckingOnboarding(false));
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
      <main className="min-h-full pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4rem))] pt-[env(safe-area-inset-top)] lg:pl-[240px] lg:pb-0 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
