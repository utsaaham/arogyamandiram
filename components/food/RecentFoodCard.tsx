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
      className="flex w-full items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 text-left transition-all hover:border-neutral-700 hover:bg-neutral-900 active:scale-[0.99]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
        <Clock className="h-4 w-4 text-emerald-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-orange-400">{name}</p>
        <p className="text-[11px] text-neutral-400">{count}× logged</p>
      </div>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
        <Plus className="h-4 w-4 text-orange-400" />
      </div>
    </button>
  );
}
