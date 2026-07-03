'use client';

import { useState } from 'react';
import { CheckSquare, Scissors } from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import { cn } from '@/lib/utils';
import TodosTab from './TodosTab';

type Tab = 'todos' | 'care';

const tabs = [
  { key: 'todos', label: 'To-dos', icon: CheckSquare },
  { key: 'care',  label: 'Care',   icon: Scissors },
] as const;

export default function TodaysPlanPage() {
  const [activeTab, setActiveTab] = useState<Tab>('todos');

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
          {activeTab === 'todos' && <TodosTab mode="todos" />}
          {activeTab === 'care'  && <TodosTab mode="care" />}
        </div>

      </div>
    </DashboardPageShell>
  );
}
