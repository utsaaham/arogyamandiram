import { Leaf, Drumstick, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoodResultCardProps {
  food: {
    id: string;
    name: string;
    category: string;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    isVegetarian: boolean;
  };
  onSelect: () => void;
}

export default function FoodResultCard({ food, onSelect }: FoodResultCardProps) {
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 text-left transition-all hover:border-neutral-700 hover:bg-neutral-900 active:scale-[0.99]"
    >
      {/* Veg/Non-veg indicator */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          food.isVegetarian ? 'bg-emerald-500/15' : 'bg-rose-500/15'
        )}
      >
        {food.isVegetarian ? (
          <Leaf className="h-4 w-4 text-emerald-400" />
        ) : (
          <Drumstick className="h-4 w-4 text-rose-400" />
        )}
      </div>

      {/* Food info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-orange-400">{food.name}</p>
        <p className="text-[11px] text-neutral-400">
          {food.servingSize}
          {food.servingUnit} ·
          <span className="ml-1 font-semibold text-orange-400">{food.calories} kcal</span>
          <span className="ml-2 capitalize text-neutral-500">{food.category.replace('_', ' ')}</span>
        </p>
      </div>

      {/* Macros */}
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <div className="text-center">
          <p className="text-xs font-semibold text-orange-400">{food.protein}g</p>
          <p className="text-[9px] text-neutral-400">P</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-orange-400">{food.carbs}g</p>
          <p className="text-[9px] text-neutral-400">C</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-orange-400">{food.fat}g</p>
          <p className="text-[9px] text-neutral-400">F</p>
        </div>
      </div>

      {/* Add icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
        <Plus className="h-4 w-4 text-orange-400" />
      </div>
    </button>
  );
}
