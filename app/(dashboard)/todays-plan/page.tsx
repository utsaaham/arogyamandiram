'use client';

import { useEffect, useState } from 'react';
import { CheckSquare, Dumbbell, Flame, Scissors, Zap } from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import { cn } from '@/lib/utils';
import OverviewTab from './OverviewTab';
import FoodTab from './FoodTab';
import WorkoutTab from './WorkoutTab';
import TodosTab from './TodosTab';
import { useUser } from '@/hooks/useUser';

type Tab = 'overview' | 'food' | 'workout' | 'todos' | 'care';

export default function TodaysPlanPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('todos');
  const aiEnabled = user?.settings?.aiEnabled !== false;
  const tabs = [
    { key: 'todos',    label: 'To-dos',   icon: CheckSquare },
    { key: 'care',     label: 'Care',     icon: Scissors },
    ...(aiEnabled
      ? [
          { key: 'overview', label: 'Overview', icon: Zap },
          { key: 'food',     label: 'Food',     icon: Flame },
          { key: 'workout',  label: 'Workout',  icon: Dumbbell },
        ] as const
      : []),
  ] as const;

  useEffect(() => {
    if (!aiEnabled && !['todos', 'care'].includes(activeTab)) setActiveTab('todos');
  }, [activeTab, aiEnabled]);

  return (
    <DashboardPageShell title="Checklist" subtitle="Your daily to-dos and the care stuff we remember for you" icon={CheckSquare}>
      <div className="space-y-4">

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
          {aiEnabled && activeTab === 'overview' && <OverviewTab />}
          {aiEnabled && activeTab === 'food'     && <FoodTab />}
          {aiEnabled && activeTab === 'workout'  && <WorkoutTab />}
          {activeTab === 'todos'    && <TodosTab mode="todos" />}
          {activeTab === 'care'     && <TodosTab mode="care" />}
        </div>

      </div>
    </DashboardPageShell>
  );
}
