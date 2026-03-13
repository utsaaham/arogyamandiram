import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { CURRENT_DASHBOARD_TOUR_VERSION } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface DashboardTourProps {
  onClose: () => void;
}

const steps = [
  {
    id: 'dashboard',
    title: 'Your health command center',
    body: 'Welcome! Your Dashboard shows a bento-style overview — calorie ring, today\'s macros, water intake, sleep quality, workout burns, streak counter, and recent badges. Everything at a glance, the moment you open the app.',
  },
  {
    id: 'sleep',
    title: 'Log sleep & track quality',
    body: 'Enter your bedtime and wake time, rate sleep quality out of 5 stars, and add optional notes. The progress ring shows hours slept vs. your nightly goal, and a 7-day bar chart reveals your sleep patterns over the week.',
  },
  {
    id: 'water',
    title: 'Stay hydrated, effortlessly',
    body: 'Tap quick-add presets (100ml, 250ml, 500ml, 750ml) or enter a custom amount. Watch the animated water glass fill in real time. The progress ring and glass indicators update with every log.',
  },
  {
    id: 'food',
    title: 'Log meals from 150+ Indian foods',
    body: 'Search curries, dals, breads, rice, street food, snacks, and more. Log entries under Breakfast, Lunch, Dinner, or Snacks. Your calorie ring and macro bars — protein, carbs, fat, fiber — update instantly with each meal.',
  },
  {
    id: 'workout',
    title: 'Track every workout session',
    body: 'Log any activity — cardio, strength, flexibility, sports, or other. See your calorie burn ring, a 7-day burn chart, and a breakdown by category. Use AI Logger to describe your workout in plain words and let it log for you.',
  },
  {
    id: 'weight',
    title: 'Monitor your weight trend',
    body: 'Enter your weight in kg or lbs and pick any timeframe — 7 days, 1 month, up to 1 year. Trend arrows show direction at a glance, and a chart makes your progress undeniable over time.',
  },
  {
    id: 'achievements',
    title: 'Level up with every habit',
    body: 'Every logging streak, goal hit, and hydration milestone earns you a badge and XP. See your current streak, all-time best streak, your level, and all unlocked badges — a reward system built into your daily health routine.',
  },
  {
    id: 'insights',
    title: 'AI insights from your real data',
    body: 'Choose Yesterday, Week, Month, or Year to get AI-generated insights from your actual logs. See what\'s working, what needs attention, and personalized coaching tips — no guesswork, just your data.',
  },
  {
    id: 'api-keys',
    title: 'Connect your own tools',
    body: 'Generate secure API keys to access your health data programmatically. Build scripts, dashboards, or integrations on top of your own personal wellness data.',
  },
  {
    id: 'targets',
    title: 'Set goals that matter to you',
    body: 'Configure daily targets: calories, water, protein, carbs, fat, sleep hours, and workout frequency. Auto-calculate from your profile or enter custom values. Every progress ring and stat card on the platform measures against these.',
  },
  {
    id: 'preferences',
    title: 'Customize your experience',
    body: 'Switch between metric and imperial units, adjust notification preferences, and tune the app to work exactly the way you like. Your settings apply across all devices.',
  },
  {
    id: 'project',
    title: 'An open wellness project',
    body: 'Arogyamandiram is open-source and community-driven. From this page, explore the roadmap, find links to contribute ideas, feedback, or code, and learn more about the philosophy behind privacy-first health tracking.',
  },
  {
    id: 'settings',
    title: 'Manage your profile & privacy',
    body: 'Update your profile (name, age, weight, height, activity level, goal), change your password, and manage privacy settings. You can also re-launch this tour any time from Settings.',
  },
  {
    id: 'closing',
    title: 'You are all set — start logging',
    body: "You've toured the full platform. Start today by logging a meal, your morning water, and last night's sleep. Small daily habits compound into big results. Your dashboard is ready.",
  },
];

const stepRoutes: Record<number, string> = {
  0: '/dashboard',
  1: '/sleep',
  2: '/water',
  3: '/food',
  4: '/workout',
  5: '/weight',
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

  // If the tour somehow mounts after being completed in this browser session, close immediately.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seenKey = 'dashboardTourSeenVersion';
      const envVersionStr = String(CURRENT_DASHBOARD_TOUR_VERSION);
      const alreadySeenSession = window.sessionStorage.getItem(seenKey) === envVersionStr;
      if (alreadySeenSession) {
        onClose();
      }
    }
  }, [onClose]);

  // Navigate to the page for the current step when stepIndex changes
  useEffect(() => {
    const targetPath = stepRoutes[stepIndex] ?? '/dashboard';
    if (pathname && targetPath !== pathname) {
      router.push(targetPath);
    }
  }, [stepIndex, router, pathname]);

  async function finishTour() {
    setFinishing(true);
    try {
      if (typeof window !== 'undefined') {
        const seenKey = 'dashboardTourSeenVersion';
        window.sessionStorage.setItem(seenKey, String(CURRENT_DASHBOARD_TOUR_VERSION));
      }
    } finally {
      setFinishing(false);
      onClose();
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center pb-[max(4.75rem,calc(var(--sab,env(safe-area-inset-bottom,0px))+3.5rem))] pt-[var(--sat,env(safe-area-inset-top,0px))] lg:items-start lg:justify-end lg:pb-0 lg:pt-0"
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

