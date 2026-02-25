'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

interface DashboardTourProps {
  onClose: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to your health hub',
    body: 'This dashboard brings together your food, water, workouts, weight, sleep, and AI insights in one place.',
  },
  {
    id: 'navigation',
    title: 'Navigation & sections',
    body: 'Use the sidebar to jump between Dashboard, Food, Water, Workout, Sleep, AI Insights, and Settings.',
  },
  {
    id: 'water',
    title: 'Track your water',
    body: 'Add quick glasses or a custom amount, and watch the water glass fill up as you move towards your daily goal.',
  },
  {
    id: 'workout',
    title: 'Log your workouts',
    body: 'Capture sets, reps, weight, and duration. Arogyamandiram will help you spot trends and personal records over time.',
  },
  {
    id: 'food',
    title: 'Log Indian meals easily',
    body: 'Search our Indian food database, save recent meals, and see how your calories and macros trend over time.',
  },
];

const stepRoutes: Record<number, string> = {
  0: '/dashboard',
  1: '/dashboard',
  2: '/water',
  3: '/workout',
  4: '/food',
};

export default function DashboardTour({ onClose }: DashboardTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const totalSteps = steps.length;
  const current = steps[stepIndex];
  const isLast = stepIndex === totalSteps - 1;

  // Navigate to the page for the current step when stepIndex changes
  useEffect(() => {
    const targetPath = stepRoutes[stepIndex] ?? '/dashboard';
    if (pathname && targetPath !== pathname) {
      router.push(targetPath);
    }
  }, [stepIndex, router, pathname]);

  async function finishTour() {
    setFinishing(true);
    // Mark completed in sessionStorage immediately so refresh never shows the tour again in this browser
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('dashboardTourComplete', 'true');
    }
    try {
      await api.updateSettings({ dashboardTourComplete: true });
    } catch {
      // Still dismiss so UI never hangs; sessionStorage already set above
    } finally {
      setFinishing(false);
      onClose();
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4rem))] pt-[env(safe-area-inset-top)] lg:items-start lg:justify-end lg:pb-0 lg:pt-0"
    >
      {/* Backdrop */}
      <div className="pointer-events-auto fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={finishTour} />

      {/* Card: centered on mobile, top-right on desktop; always above bottom nav on mobile */}
      <div className="pointer-events-auto relative z-50 m-4 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface-elevated p-4 shadow-xl outline outline-1 outline-white/5 lg:mt-20 lg:mr-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Step {stepIndex + 1} of {totalSteps}
            </p>
            <h2 className="mt-1 text-base font-semibold text-text-primary">
              {current.title}
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              {current.body}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-secondary disabled:opacity-50"
            onClick={finishTour}
            disabled={finishing}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setStepIndex(idx)}
                className={cn(
                  'h-1.5 rounded-full bg-white/10 transition-all',
                  idx === stepIndex ? 'w-6 bg-accent-violet' : 'w-2 hover:bg-white/20',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((idx) => Math.max(0, idx - 1))}
                disabled={finishing}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-text-muted hover:border-white/20 hover:text-text-secondary disabled:opacity-50"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  void finishTour();
                } else {
                  setStepIndex((idx) => Math.min(totalSteps - 1, idx + 1));
                }
              }}
              disabled={finishing}
              className="inline-flex items-center gap-1 rounded-full bg-accent-violet px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent-violet/90 disabled:opacity-50"
            >
              {finishing ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {isLast ? 'Finish' : 'Next'}
                  {!isLast && <ChevronRight className="h-3 w-3" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

