'use client';

import { CheckSquare } from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import TodosTab from './TodosTab';

export default function TodaysPlanPage() {
  return (
    <DashboardPageShell title="Checklist" subtitle="Daily to-dos, plus your own groups for everything on a cycle" icon={CheckSquare}>
      <div className="mt-4 space-y-4 mobile-fade-up mobile-dash-px lg:px-0">
        <TodosTab />
      </div>
    </DashboardPageShell>
  );
}
