'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dumbbell, Flame, Sparkles, Zap } from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import { cn } from '@/lib/utils';
import OverviewTab from './OverviewTab';
import FoodTab from './FoodTab';
import WorkoutTab from './WorkoutTab';
import { useUser } from '@/hooks/useUser';

type Tab = 'overview' | 'food' | 'workout';

const tabs = [
  { key: 'overview', label: 'Overview', icon: Zap },
  { key: 'food',     label: 'Food',     icon: Flame },
  { key: 'workout',  label: 'Workout',  icon: Dumbbell },
] as const;

export default function CoachPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const aiEnabled = user?.settings?.aiEnabled !== false;

  return (
    <DashboardPageShell title="Coach" subtitle="Your day, planned overnight — insights, meals and training tuned to your logs" icon={Sparkles}>
      <div className="space-y-4">

        {aiEnabled ? (
          <>
            <div className="mt-4 mobile-fade-up mobile-dash-px lg:px-0 -mx-4 sm:mx-0">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 sm:px-0 lg:flex-wrap lg:overflow-visible lg:px-0">
                {tabs.map((tab) => (
                  <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                      activeTab === tab.key
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                    )}>
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4 mobile-fade-up mobile-dash-px lg:px-0">
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'food'     && <FoodTab />}
              {activeTab === 'workout'  && <WorkoutTab />}
            </div>
          </>
        ) : (
          <div className="mt-4 dashboard-unified-card rounded-2xl border p-5 mobile-fade-up mobile-dash-px lg:px-0">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Sparkles className="h-10 w-10 text-zinc-600" />
              <p className="text-sm font-medium text-zinc-300">AI features are turned off</p>
              <p className="text-xs text-zinc-500">
                Your coach needs AI enabled to plan your day. Turn it on in Settings to get daily insights, meal ideas and workouts.
              </p>
              <Link
                href="/settings"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
              >
                Open Settings
              </Link>
            </div>
          </div>
        )}

      </div>
    </DashboardPageShell>
  );
}
