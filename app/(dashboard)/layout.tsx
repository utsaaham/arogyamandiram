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
    <div className="min-h-screen">
      <Sidebar />
      <MobileNav />
      {/* Top fade mask (mobile): content fades into background when scrolling */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 right-0 top-0 z-40 lg:hidden"
        style={{
          height: '2rem',
          paddingTop: 'env(safe-area-inset-top)',
          background: 'linear-gradient(to bottom, var(--bg-primary) 0%, transparent 100%)',
        }}
      />
      {/* Bottom fade mask (mobile): content fades into nav so bar doesn't look like a sticker */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        style={{
          height: 'max(3rem, calc(env(safe-area-inset-bottom) + 2rem))',
          background: 'linear-gradient(to top, var(--bg-surface) 0%, transparent 100%)',
        }}
      />
      <main className="pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4rem))] pt-[env(safe-area-inset-top)] lg:pl-[240px] lg:pb-0 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
