import { Suspense, type ReactNode } from 'react';
import DashboardLayoutClient from '@/components/layout/DashboardLayoutClient';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))' }}
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
        </div>
      }
    >
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </Suspense>
  );
}
