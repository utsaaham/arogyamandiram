'use client';

import { Clock, Plus } from 'lucide-react';

interface RecentFoodCardProps {
  name: string;
  count: number;
  onSelect: () => void;
}

export default function RecentFoodCard({ name, count, onSelect }: RecentFoodCardProps) {
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] p-3 text-left transition-all hover:bg-white/[0.06] active:scale-[0.99]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-emerald/10">
        <Clock className="h-4 w-4 text-accent-emerald" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        <p className="text-[11px] text-text-muted">{count}× logged</p>
      </div>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-violet/10">
        <Plus className="h-4 w-4 text-accent-violet" />
      </div>
    </button>
  );
}
