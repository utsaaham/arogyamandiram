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
    id: 'dashboard',
    title: 'Your health dashboard',
    body: 'This is your Dashboard. Here you see a quick snapshot of your sleep, water, food, workouts, weight, and more in one place.',
  },
  {
    id: 'sleep',
    title: 'Sleep overview',
    body: 'In Sleep, you can log how long and how well you slept. You can also lock a day’s sleep entry so it is not changed by mistake.',
  },
  {
    id: 'water',
    title: 'Stay hydrated',
    body: 'Use the Water tracker to add each glass you drink and see how close you are to your daily hydration target.',
  },
  {
    id: 'workout',
    title: 'Log your workouts',
    body: 'In Workout, you can record your activity sessions and see how consistently you are moving over time.',
  },
  {
    id: 'food',
    title: 'Track your food',
    body: 'In Food, you can log your meals and snacks and later see patterns in your eating, calories, and macros.',
  },
  {
    id: 'weight',
    title: 'Monitor your weight',
    body: 'The Weight section helps you track your weight over time so you can see your trend against your goals.',
  },
  {
    id: 'achievements',
    title: 'Achievements & streaks',
    body: 'Achievements show your streaks and milestones for habits like logging, water, workouts, and sleep to keep you motivated.',
  },
  {
    id: 'insights',
    title: 'Insights & trends',
    body: 'Insights brings together your data to show simple trends across sleep, food, water, workouts, and more.',
  },
  {
    id: 'api-keys',
    title: 'API keys for developers',
    body: 'Under API Keys you can generate keys to integrate this platform with your own tools and workflows.',
  },
  {
    id: 'targets',
    title: 'Set your targets',
    body: 'Targets lets you set daily goals like water, sleep duration, workout frequency, and calorie intake so progress is measured against what matters to you.',
  },
  {
    id: 'preferences',
    title: 'Preferences & experience',
    body: 'In Preferences, you can adjust notifications, units, and other options so the app works the way you like.',
  },
  {
    id: 'project',
    title: 'About the project',
    body: 'This is an open wellbeing project. From the Project page you can learn more and find links to contribute with ideas, feedback, or code.',
  },
  {
    id: 'settings',
    title: 'Settings for everything',
    body: 'In Settings you can manage your profile, privacy, notifications, and open this platform tour again any time.',
  },
  {
    id: 'closing',
    title: 'You are ready to explore',
    body: 'That is the overview of the platform. Explore the dashboard at your own pace—your habits, insights, and goals all live here for you.',
  },
];

const stepRoutes: Record<number, string> = {
  0: '/dashboard',
  1: '/sleep',
  2: '/water',
  3: '/food',
  4: '/weight',
  5: '/workout',
  6: '/achievements',
  7: '/ai-insights',
  8: '/api-keys',
  9: '/targets',
  10: '/preferences',
  11: '/project',
  12: '/settings',
  13: '/dashboard',
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
      className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center pb-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.5rem))] pt-[env(safe-area-inset-top)] lg:items-start lg:justify-end lg:pb-0 lg:pt-0"
    >
      {/* Backdrop */}
      <div className="pointer-events-auto fixed inset-0 bg-black/30" onClick={finishTour} />

      {/* Card: bottom on mobile, top-right on desktop; always just above bottom nav on mobile */}
      <div className="pointer-events-auto relative z-50 mx-4 mb-1 mt-4 w-full max-w-md lg:m-0 lg:mt-4 lg:mr-4">
        {/* Subtle blur directly behind the card for readability on all devices */}
        <div className="max-h-[85vh] overflow-y-auto rounded-2xl bg-surface-elevated/90 p-4 shadow-xl outline outline-1 outline-white/5 backdrop-blur-md">
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
    </div>
  );
}

